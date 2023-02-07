import React from 'react'
import { useParams } from 'react-router-dom'
import NotFound from '../components/NotFound'
// import { useSelector } from 'react-redux'

const generatePage = (pageName) => {
    //pages icinde register login falan var
    //ona gore .. seklinde yazdik
    const component = () => require(`../pages/${pageName}`).default
    try {
        return React.createElement(component())
    } catch (err) {
        return <NotFound />
    }
}

const PageRender = () => {
    const { page, id } = useParams()
    // const { auth } = useSelector(state => state)

    console.log(page,id)
    let pageName = "";

    // if (auth.token) {
    if (id) {
        pageName = `${page}/[id]`
    } else {
        pageName = `${page}`
    }
    // }

    return generatePage(pageName)
}

export default PageRender